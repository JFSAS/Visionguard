import numpy as np
import faiss
from id_generator import UniqueIDGenerator
import os
import pickle
import shutil
generator = UniqueIDGenerator("current_value.txt")


class VectorDatabase:
    def __init__(self, dimension):
        """
        初始化向量数据库
        :param dimension: 向量的维度
        """
        self.dimension = dimension
        self.index = faiss.IndexFlatIP(dimension)  # 使用内积计算余弦相似度
        self.index_id_map = faiss.IndexIDMap(self.index)
        self.gpu_index = faiss.index_cpu_to_gpu(faiss.StandardGpuResources(), 0, self.index_id_map)
        self.store = {}

    def add_vectors(self, vectors, ids=None, threshold=0.8):
        """
        添加向量到数据库
        :param vector: 要添加的向量（numpy数组）
        """
        if vectors.shape[1] != self.dimension:
            raise ValueError("向量维度不匹配")
        # 归一化向量以计算余弦相似度
        vector_norms = np.linalg.norm(vectors, axis=1)
        normalized_vectors = vectors / vector_norms[:, np.newaxis]
        search_results = self.search_vectors(normalized_vectors, 1)
        new_ids = []
        all_ids = []
        new_vectors = []
        if ids is not None:
            threshold = 10

        for i, search_result in enumerate(search_results):
            if search_result == []:
                distance = 0
            else:
                id_, distance = search_result[0]
            if distance < threshold:
                if ids is not None:
                    new_id = ids[i]
                else:
                    new_id = generator.generate_id()
                new_ids.append(new_id)
                new_vectors.append(normalized_vectors[i])
                all_ids.append(new_id)
                self.store[new_id] = normalized_vectors[i]
            else:
                all_ids.append(id_)
        if new_ids != []:
            self.gpu_index.add_with_ids(np.array(new_vectors, dtype=np.float32), np.array(new_ids, dtype=np.int64))
        return [int(idx) for idx in all_ids]

    def delete_vector(self, vector_id):
        """
        从数据库中删除向量
        :param vector_id: 要删除的向量的ID
        """
        # 从GPU索引中删除
        # 将 GPU 索引切换回 CPU
        cpu_index = faiss.index_gpu_to_cpu(self.gpu_index)
        cpu_index.remove_ids(np.array([vector_id], dtype=np.int64))
        self.gpu_index = faiss.index_cpu_to_gpu(faiss.StandardGpuResources(), 0, cpu_index)
        self.store.pop(vector_id)

    def search_vectors(self, query_vectors, k=5):
        """
        搜索与查询向量最相似的k个向量
        :param query_vectors: 查询向量的二维数组，每一行是一个查询向量
        :param k: 返回的最相似向量的数量
        :return: 最相似向量的ID列表和对应的余弦相似度
        """
        if query_vectors.shape[1] != self.dimension:
            raise ValueError("查询向量的维度不匹配")

        # 归一化查询向量
        query_norms = np.linalg.norm(query_vectors, axis=1)
        normalized_queries = query_vectors / query_norms[:, np.newaxis]

        # 搜索
        cosine, indices = self.gpu_index.search(normalized_queries.astype(np.float32), k)

        # 获取对应的ID和距离
        results = []
        for i in range(len(indices)):
            results.append([(indices[i][j], cosine[i][j]) for j in range(len(indices[i])) if indices[i][j] != -1])

        return results

    def update_vector(self, vector_ids, new_vectors):
        """
        更新指定ID的向量
        :param vector_id: 要更新的向量的ID
        :param new_vector: 新的向量
        """
        # 删除旧向量
        self.delete_vector(vector_ids)
        # 添加新向量
        self.add_vector(new_vectors)

    def save_index(self, filename):
        """
        将索引保存到文件
        :param filename: 文件名
        """
        # 将GPU索引转换为CPU索引，因为Faiss只支持将CPU索引保存到文件
        db_f = filename
        store_f = f"{filename.split('.')[0]}.pkl"
        if os.path.exists(db_f):
            shutil.copy2(db_f, f"{db_f}.bak")

        if os.path.exists(store_f):
            shutil.copy2(store_f, f"{store_f}.bak")

        cpu_index = faiss.index_gpu_to_cpu(self.gpu_index)
        faiss.write_index(cpu_index, db_f)
        with open(store_f, 'wb') as f:
            pickle.dump(self.store, f)
        print(f"索引已保存到文件：{filename}")

    def load_index(self, filename):
        """
        从文件加载索引
        :param filename: 文件名
        """
        # 从文件加载索引
        if not os.path.exists(filename):
            return
        self.index = faiss.read_index(filename)
        self.gpu_index = faiss.index_cpu_to_gpu(faiss.StandardGpuResources(), 0, self.index)
        with open(f"{filename.split('.')[0]}.pkl", 'rb') as f:
            self.store = pickle.load(f)

    def get_vector_by_id(self, vector_id):
        """
        根据 ID 获取向量
        :param vector_id: 向量的ID
        :return: 对应的向量，如果ID不存在则返回None
        """
        return self.store.get(vector_id, None)

# 示例用法
if __name__ == "__main__":
    # 初始化向量数据库，假设向量维度为128
    db = VectorDatabase(128)

    # 添加一些向量
    np.random.seed(42)
    # for i in range(1000):
    vector = np.random.rand(128).astype(np.float32)
    vectors = np.array([vector, -vector])
    ids = db.add_vectors(vectors)

    # 搜索最相似的向量
    # query_vector = np.random.rand(128).astype(np.float32)
    # results = db.search_vectors(query_vector, k=3)
    # print("搜索结果：")
    # for result in results:
    #     print(f"ID: {result[0]}, 余弦相似度: {result[1]}")
    res1 = db.search_vectors(np.array([vector, -vector]), k=3)
    db.delete_vector(ids[0])
    res2 = db.search_vectors(np.array([vector, -vector]), k=3)
    # 更新一个向量
    new_vector = np.random.rand(128).astype(np.float32)
    db.update_vector(0, new_vector)

    # 删除一个向量
    # db.delete_vector(1)

    # 再次搜索
    results = db.search_vector(query_vector, k=3)
    print("更新和删除后的搜索结果：")
    for result in results:
        print(f"ID: {result[0]}, 余弦相似度: {result[1]}")